import cv2
from ultralytics import YOLO
from app.core.config import settings
import numpy as np
from collections import defaultdict
from app.services import live_status_manager
# Load YOLOv8 model
try:
    yolo_model = YOLO(settings.YOLO_MODEL_PATH)
    # Filter for 'person' class (class ID 0 in COCO dataset)
    yolo_model.classes = [0] 
except Exception as e:
    print(f"Error loading YOLO model: {e}. Ensure '{settings.YOLO_MODEL_PATH}' is correct or allow auto-download.")
    yolo_model = None

# Store previous centroids for tripwire tracking
# This should ideally be managed per camera instance if multiple streams are processed by one worker
# For simplicity here, it's global. In a multi-camera/multi-worker setup, this needs refinement.
prev_centroids = defaultdict(lambda: None) 
object_cross_status = defaultdict(lambda: None) # To track if an object has crossed (in, out, or None)

def point_segment_distance(p, a, b):
    """Calculate the distance from point p to line segment ab."""
    if np.all(a == b):
        return np.linalg.norm(p - a)
    # normalized tangent vector
    d = np.divide(b - a, np.linalg.norm(b - a))
    # signed parallel distance components
    s = np.dot(a - p, d)
    t = np.dot(p - b, d)
    # clamped parallel distance
    h = np.maximum.reduce([s, t, 0])
    # perpendicular distance component
    c = np.cross(p - a, d)
    return np.hypot(h, np.abs(c))


def check_line_crossing(centroid, prev_centroid, line_p1, line_p2):
    if prev_centroid is None:
        return 0 # No previous position, cannot determine crossing

    # Create vectors for line segment and movement
    line_vec = np.array(line_p2) - np.array(line_p1)
    p1_to_prev = prev_centroid - np.array(line_p1)
    p1_to_curr = centroid - np.array(line_p1)

    # Cross products to determine on which side of the line the points are
    # (Ax - Cx)(By - Ay) - (Ay - Cy)(Bx - Ax)
    prev_side = np.cross(line_vec, p1_to_prev)
    curr_side = np.cross(line_vec, p1_to_curr)

    # If signs are different, a crossing might have occurred
    if np.sign(prev_side) != np.sign(curr_side) and np.sign(prev_side) != 0 and np.sign(curr_side) !=0:
        # Check if intersection point is within segment bounds
        # This simplified check assumes the movement vector intersects the line segment
        # A more robust method would use line intersection formulas.
        
        # Simplified check: if the movement line (prev_centroid to centroid)
        # intersects the tripwire line (line_p1 to line_p2)
        # For a robust solution, use a line segment intersection algorithm
        # (e.g. https://www.geeksforgeeks.org/check-if-two-given-line-segments-intersect/)

        # Heuristic: if the centroid is now very close to the line, and was on the other side
        dist_to_line = point_segment_distance(centroid, np.array(line_p1), np.array(line_p2))

        if dist_to_line < 10: # Threshold for closeness, adjust as needed
            if curr_side > 0: # Example: positive cross product means "entry"
                return 1 # Entry
            else:
                return -1 # Exit
    return 0 # No crossing


def process_frame(frame, camera_config, db_camera_obj=None):
    global prev_centroids, object_cross_status
    if not yolo_model:
        return frame, 0, 0.0, 0, 0, False, "YOLO model not loaded" # frame, count, density, entry, exit, alert, alert_msg

    results = yolo_model.track(frame, persist=True, verbose=False, classes=[0]) # Track persons
    
    annotated_frame = results[0].plot() # Use ultralytics plotter
    person_count = 0
    detected_persons_info = [] # Store (id, centroid)

    if results[0].boxes is not None and results[0].boxes.id is not None:
        person_count = len(results[0].boxes.id)
        for box in results[0].boxes:
            if box.id is not None: # Check if tracking ID is available
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)
                obj_id = int(box.id.cpu().numpy()[0])
                detected_persons_info.append({'id': obj_id, 'centroid': (cx, cy)})
                cv2.circle(annotated_frame, (cx, cy), 3, (0, 0, 255), -1) # Draw centroid
    

    density = 0.0
    entry_count_frame = 0
    exit_count_frame = 0
    alert_triggered = False
    alert_message = ""
    live_status_manager.update_live_status(
        camera_id=camera_config.id,
        person_count=person_count, # from YOLO
        density=density,      # calculated
        current_occupancy=current_occupancy if camera_config.mode == "tripwire" else 0
    )
    if camera_config.mode == "general":
        if camera_config.area_sq_meters > 0:
            density = person_count / camera_config.area_sq_meters
        
        # Draw info on frame
        cv2.putText(annotated_frame, f"Persons: {person_count}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(annotated_frame, f"Density: {density:.2f} p/m2", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        if person_count > camera_config.crowd_threshold:
            alert_triggered = True
            alert_message = f"Crowd threshold exceeded ({person_count}/{camera_config.crowd_threshold})"
            cv2.putText(annotated_frame, "ALERT: CROWD LIMIT REACHED!", (10, frame.shape[0] - 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)

    elif camera_config.mode == "tripwire":
        current_occupancy = db_camera_obj.current_occupancy if db_camera_obj else 0
        
        if camera_config.tripwire_line_x1 is not None and \
           camera_config.tripwire_line_y1 is not None and \
           camera_config.tripwire_line_x2 is not None and \
           camera_config.tripwire_line_y2 is not None:
            
            p1 = (camera_config.tripwire_line_x1, camera_config.tripwire_line_y1)
            p2 = (camera_config.tripwire_line_x2, camera_config.tripwire_line_y2)
            cv2.line(annotated_frame, p1, p2, (255, 0, 0), 2) # Draw tripwire

            # Define entry/exit based on line orientation (e.g., p1 to p2 direction)
            # Crossing from left to right of vector (p1->p2) could be 'entry'
            # This requires consistent line drawing by user or definition.
            # For simplicity: one side is IN, other is OUT based on cross product sign.

            processed_ids_this_frame = set()

            for person_info in detected_persons_info:
                obj_id = person_info['id']
                centroid = np.array(person_info['centroid'])
                processed_ids_this_frame.add(obj_id)

                if prev_centroids[obj_id] is not None:
                    crossing_direction = check_line_crossing(centroid, prev_centroids[obj_id], p1, p2)
                    
                    # Ensure an object is counted only once per crossing "event"
                    if crossing_direction == 1 and object_cross_status[obj_id] != "in": # Entry
                        entry_count_frame += 1
                        current_occupancy +=1
                        object_cross_status[obj_id] = "in"
                        cv2.line(annotated_frame, tuple(prev_centroids[obj_id].astype(int)), tuple(centroid.astype(int)), (0,255,0), 2) # Green for entry
                    elif crossing_direction == -1 and object_cross_status[obj_id] != "out": # Exit
                        exit_count_frame += 1
                        current_occupancy -=1
                        object_cross_status[obj_id] = "out"
                        cv2.line(annotated_frame, tuple(prev_centroids[obj_id].astype(int)), tuple(centroid.astype(int)), (0,0,255), 2) # Red for exit
                    # If no crossing, but was near line, reset status if moved away
                    elif crossing_direction == 0:
                         # If far from line, reset crossing status to allow re-crossing
                        dist_to_line = point_segment_distance(centroid, np.array(p1), np.array(p2))
                        if dist_to_line > 20: # Moved away from the line
                             object_cross_status[obj_id] = None

                prev_centroids[obj_id] = centroid
            
            # Clean up trackers for objects no longer detected
            # This is important to prevent memory leaks with prev_centroids and object_cross_status
            # Ultralytics tracker might handle this internally if persist=False for some frames,
            # but explicit cleanup is safer for our auxiliary tracking dicts.
            current_tracked_ids = set(person_info['id'] for person_info in detected_persons_info)
            ids_to_remove = [obj_id for obj_id in prev_centroids if obj_id not in current_tracked_ids]
            for obj_id in ids_to_remove:
                del prev_centroids[obj_id]
                del object_cross_status[obj_id]


        cv2.putText(annotated_frame, f"In: {entry_count_frame}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(annotated_frame, f"Out: {exit_count_frame}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        cv2.putText(annotated_frame, f"Occupancy: {current_occupancy}", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

        if current_occupancy > camera_config.occupancy_threshold:
            alert_triggered = True
            alert_message = f"Occupancy threshold exceeded ({current_occupancy}/{camera_config.occupancy_threshold})"
            cv2.putText(annotated_frame, "ALERT: OCCUPANCY LIMIT!", (10, frame.shape[0] - 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
        
        # Persist current_occupancy to db_camera_obj if available (done in stream.py)
        if db_camera_obj:
            db_camera_obj.current_occupancy = current_occupancy # This will be committed by the caller
            
    return annotated_frame, person_count, density, entry_count_frame, exit_count_frame, alert_triggered, alert_message, current_occupancy if camera_config.mode == "tripwire" else 0