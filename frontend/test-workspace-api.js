// Test script to debug workspace API
// Run this in the browser console at http://localhost:8081/dashboard/workspaces

console.log('=== Workspace API Debug ===');

// Check auth
console.log('Auth token:', localStorage.getItem('authToken'));
console.log('User data:', JSON.parse(localStorage.getItem('user') || '{}'));

// Test API directly
fetch('http://localhost:3001/api/workspaces', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
  }
})
.then(response => {
  console.log('Response status:', response.status);
  console.log('Response headers:', [...response.headers.entries()]);
  return response.json();
})
.then(data => {
  console.log('API Response:', data);
  console.log('Workspaces:', data.data?.workspaces);
})
.catch(error => {
  console.error('API Error:', error);
});