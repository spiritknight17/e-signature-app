import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000' // Assuming backend runs on 3000
});

// Interceptor to add auth token if needed later
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });
