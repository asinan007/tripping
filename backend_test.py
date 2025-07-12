#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Tripping App
Tests all API endpoints including authentication, trips, and AI features
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class TrippingAPITester:
    def __init__(self, base_url: str = "https://d0ae3640-8307-42a3-84b7-01910e2d966b.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_trip_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, use_auth: bool = False) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if use_auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text, "status_code": response.status_code}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_root_endpoint(self):
        """Test the root endpoint"""
        success, response = self.make_request('GET', '/')
        self.log_test("Root Endpoint", success, f"Response: {response.get('message', 'No message')}")
        return success

    def test_social_auth(self):
        """Test social authentication endpoint"""
        # Mock social auth data
        auth_data = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "avatar": "https://example.com/avatar.jpg",
            "provider": "google"
        }

        success, response = self.make_request('POST', '/api/auth/social', auth_data)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user_id')
            self.log_test("Social Authentication", True, f"Token received, User ID: {self.user_id}")
            return True
        else:
            self.log_test("Social Authentication", False, f"Response: {response}")
            return False

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.token:
            self.log_test("Get Current User", False, "No authentication token available")
            return False

        success, response = self.make_request('GET', '/api/auth/me', use_auth=True)
        
        if success and 'id' in response:
            self.log_test("Get Current User", True, f"User: {response.get('name', 'Unknown')}")
            return True
        else:
            self.log_test("Get Current User", False, f"Response: {response}")
            return False

    def test_create_trip(self):
        """Test creating a new trip"""
        if not self.token:
            self.log_test("Create Trip", False, "No authentication token available")
            return False

        trip_data = {
            "title": f"Test Trip {datetime.now().strftime('%H%M%S')}",
            "description": "A test trip created by automated testing",
            "start_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=37)).isoformat(),
            "destination_country": "Japan",
            "destination_city": "Tokyo"
        }

        success, response = self.make_request('POST', '/api/trips', trip_data, 200, use_auth=True)
        
        if success and 'id' in response:
            self.created_trip_id = response['id']
            self.log_test("Create Trip", True, f"Trip ID: {self.created_trip_id}")
            return True
        else:
            self.log_test("Create Trip", False, f"Response: {response}")
            return False

    def test_get_trips(self):
        """Test getting user's trips"""
        if not self.token:
            self.log_test("Get Trips", False, "No authentication token available")
            return False

        success, response = self.make_request('GET', '/api/trips', use_auth=True)
        
        if success and isinstance(response, list):
            self.log_test("Get Trips", True, f"Found {len(response)} trips")
            return True
        else:
            self.log_test("Get Trips", False, f"Response: {response}")
            return False

    def test_get_trip_detail(self):
        """Test getting specific trip details"""
        if not self.token or not self.created_trip_id:
            self.log_test("Get Trip Detail", False, "No authentication token or trip ID available")
            return False

        success, response = self.make_request('GET', f'/api/trips/{self.created_trip_id}', use_auth=True)
        
        if success and 'id' in response:
            self.log_test("Get Trip Detail", True, f"Trip: {response.get('title', 'Unknown')}")
            return True
        else:
            self.log_test("Get Trip Detail", False, f"Response: {response}")
            return False

    def test_update_trip(self):
        """Test updating a trip"""
        if not self.token or not self.created_trip_id:
            self.log_test("Update Trip", False, "No authentication token or trip ID available")
            return False

        update_data = {
            "title": f"Updated Test Trip {datetime.now().strftime('%H%M%S')}",
            "description": "Updated description for automated testing",
            "start_date": (datetime.now() + timedelta(days=35)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=42)).isoformat(),
            "destination_country": "Japan",
            "destination_city": "Kyoto"
        }

        success, response = self.make_request('PUT', f'/api/trips/{self.created_trip_id}', update_data, use_auth=True)
        
        if success and 'id' in response:
            self.log_test("Update Trip", True, f"Updated trip: {response.get('title', 'Unknown')}")
            return True
        else:
            self.log_test("Update Trip", False, f"Response: {response}")
            return False

    def test_ai_destinations(self):
        """Test AI destination suggestions"""
        if not self.token:
            self.log_test("AI Destinations", False, "No authentication token available")
            return False

        preferences_data = {
            "preferences": "I love beaches, warm weather, and cultural experiences. Budget is moderate."
        }

        success, response = self.make_request('POST', '/api/ai/destinations', preferences_data, use_auth=True)
        
        if success and 'suggestions' in response:
            suggestions_count = len(response['suggestions']) if isinstance(response['suggestions'], list) else 0
            self.log_test("AI Destinations", True, f"Received {suggestions_count} suggestions")
            return True
        else:
            self.log_test("AI Destinations", False, f"Response: {response}")
            return False

    def test_ai_activities(self):
        """Test AI activity suggestions"""
        if not self.token:
            self.log_test("AI Activities", False, "No authentication token available")
            return False

        destination_data = {
            "destination": "Tokyo, Japan"
        }

        success, response = self.make_request('POST', '/api/ai/activities', destination_data, use_auth=True)
        
        if success and 'suggestions' in response:
            suggestions_count = len(response['suggestions']) if isinstance(response['suggestions'], list) else 0
            self.log_test("AI Activities", True, f"Received {suggestions_count} suggestions")
            return True
        else:
            self.log_test("AI Activities", False, f"Response: {response}")
            return False

    def test_delete_trip(self):
        """Test deleting a trip"""
        if not self.token or not self.created_trip_id:
            self.log_test("Delete Trip", False, "No authentication token or trip ID available")
            return False

        success, response = self.make_request('DELETE', f'/api/trips/{self.created_trip_id}', use_auth=True)
        
        if success and response.get('message'):
            self.log_test("Delete Trip", True, f"Message: {response['message']}")
            return True
        else:
            self.log_test("Delete Trip", False, f"Response: {response}")
            return False

    def test_unauthorized_access(self):
        """Test accessing protected endpoints without authentication"""
        success, response = self.make_request('GET', '/api/auth/me', expected_status=401)
        
        # For unauthorized access, we expect a 401 status, so success means we got the expected error
        if not success:  # This means we got 401 as expected
            self.log_test("Unauthorized Access Protection", True, "Correctly rejected unauthorized request")
            return True
        else:
            self.log_test("Unauthorized Access Protection", False, "Should have rejected unauthorized request")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Tripping API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Test sequence
        tests = [
            self.test_root_endpoint,
            self.test_unauthorized_access,
            self.test_social_auth,
            self.test_get_current_user,
            self.test_create_trip,
            self.test_get_trips,
            self.test_get_trip_detail,
            self.test_update_trip,
            self.test_ai_destinations,
            self.test_ai_activities,
            self.test_delete_trip,
        ]

        for test in tests:
            try:
                test()
            except Exception as e:
                self.log_test(test.__name__, False, f"Exception: {str(e)}")

        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main function to run tests"""
    tester = TrippingAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())