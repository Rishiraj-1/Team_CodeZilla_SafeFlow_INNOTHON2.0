import unittest
import math
import sys
import types

# Mock numpy
mock_np = types.ModuleType('numpy')
mock_np.all = lambda x: all(x) if hasattr(x, '__iter__') else x
mock_np.dot = lambda a, b: sum(x*y for x,y in zip(a,b))
mock_np.divide = lambda a, b: [x/b for x in a] if isinstance(b, (int, float)) else [x/y for x,y in zip(a,b)]
mock_np.cross = lambda a, b: a[0]*b[1] - a[1]*b[0]
mock_np.hypot = math.hypot
mock_np.abs = abs
mock_np.maximum = type('max', (), {'reduce': staticmethod(max)})
mock_np.linalg = type('linalg', (), {'norm': staticmethod(lambda a: math.sqrt(sum(x*x for x in a)))})

class Array(list):
    def __sub__(self, other): return Array(x-y for x,y in zip(self, other))
    def __eq__(self, other): return all(x==y for x,y in zip(self, other))

mock_np.array = Array
sys.modules['numpy'] = mock_np

# Mock ultralytics
mock_ultralytics = types.ModuleType('ultralytics')
class MockYOLO:
    def __init__(self, *args, **kwargs):
        self.classes = []
mock_ultralytics.YOLO = MockYOLO
sys.modules['ultralytics'] = mock_ultralytics

# Mock cv2
sys.modules['cv2'] = types.ModuleType('cv2')

# Mock app.core.config
mock_config = types.ModuleType('app.core.config')
mock_config.settings = type('settings', (), {'YOLO_MODEL_PATH': 'mock'})
sys.modules['app.core.config'] = mock_config

# Mock app.services.live_status_manager
mock_lsm = types.ModuleType('app.services.live_status_manager')
sys.modules['app.services.live_status_manager'] = mock_lsm

# Mock app.services
mock_services = types.ModuleType('app.services')
mock_services.live_status_manager = mock_lsm
sys.modules['app.services'] = mock_services

from safeflow.app.services.video_processing import point_segment_distance

class TestPointSegmentDistance(unittest.TestCase):
    def test_point_segment_distance_perpendicular(self):
        a = Array([0.0, 0.0])
        b = Array([10.0, 0.0])
        p = Array([5.0, 5.0])
        self.assertAlmostEqual(point_segment_distance(p, a, b), 5.0)

    def test_point_segment_distance_before_start(self):
        a = Array([0.0, 0.0])
        b = Array([10.0, 0.0])
        p = Array([-3.0, 4.0])
        self.assertAlmostEqual(point_segment_distance(p, a, b), 5.0)

    def test_point_segment_distance_after_end(self):
        a = Array([0.0, 0.0])
        b = Array([10.0, 0.0])
        p = Array([13.0, -4.0])
        self.assertAlmostEqual(point_segment_distance(p, a, b), 5.0)

    def test_point_segment_distance_on_segment(self):
        a = Array([0.0, 0.0])
        b = Array([10.0, 0.0])
        p = Array([5.0, 0.0])
        self.assertAlmostEqual(point_segment_distance(p, a, b), 0.0)

    def test_point_segment_distance_at_endpoint(self):
        a = Array([0.0, 0.0])
        b = Array([10.0, 0.0])
        p = Array([10.0, 0.0])
        self.assertAlmostEqual(point_segment_distance(p, a, b), 0.0)

    def test_point_segment_distance_degenerate_segment(self):
        a = Array([2.0, 2.0])
        b = Array([2.0, 2.0])
        p = Array([5.0, 6.0])
        self.assertAlmostEqual(point_segment_distance(p, a, b), 5.0)

    def test_point_segment_distance_vertical(self):
        a = Array([0.0, 0.0])
        b = Array([0.0, 10.0])
        p = Array([3.0, 5.0])
        self.assertAlmostEqual(point_segment_distance(p, a, b), 3.0)

if __name__ == '__main__':
    unittest.main()
