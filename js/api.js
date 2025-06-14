// const API_BASE_URL = 'https://asmine-production.up.railway.app/api';

// export async function fetchProducts(page = 1) {
//   try {
//     const response = await fetch(`${API_BASE_URL}/products?page=${page}`, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*'
//       }
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();
    
//     if (!data.success) {
//       throw new Error('API response indicates failure');
//     }

//     return {
//       products: data.products || [],
//       totalProducts: data.totalProducts || 0,
//       totalPages: data.totalPages || 1,
//       itemsPerPage: 20
//     };
//   } catch (error) {
//     console.error('Error fetching products:', error);
//     throw error;
//   }
// }

// export async function updateProduct(productId, updateData) {
//   try {
//     const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*'
//       },
//       body: JSON.stringify(updateData)
//     });

//     const result = await response.json();

//     if (!result.success) {
//       throw new Error(result.error || 'Failed to update product');
//     }

//     return result;
//   } catch (error) {
//     console.error('Error updating product:', error);
//     throw error;
//   }
// }

// export async function addReview(productId, reviewData) {
//   try {
//     const response = await fetch(`${API_BASE_URL}/products/${productId}/reviews`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*'
//       },
//       body: JSON.stringify(reviewData)
//     });

//     const result = await response.json();

//     if (!result.success) {
//       throw new Error(result.error || 'Failed to add review');
//     }

//     return result;
//   } catch (error) {
//     console.error('Error adding review:', error);
//     throw error;
//   }
// }

// export async function updateReview(productId, reviewId, reviewData) {
//   try {
//     const response = await fetch(`${API_BASE_URL}/products/${productId}/reviews/${reviewId}`, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*'
//       },
//       body: JSON.stringify(reviewData)
//     });

//     const result = await response.json();

//     if (!result.success) {
//       throw new Error(result.error || 'Failed to update review');
//     }

//     return result;
//   } catch (error) {
//     console.error('Error updating review:', error);
//     throw error;
//   }
// }

// export async function deleteReview(productId, reviewId) {
//   try {
//     const response = await fetch(`${API_BASE_URL}/products/${productId}/reviews/${reviewId}`, {
//       method: 'DELETE',
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*'
//       }
//     });

//     const result = await response.json();

//     if (!result.success) {
//       throw new Error(result.error || 'Failed to delete review');
//     }

//     return result;
//   } catch (error) {
//     console.error('Error deleting review:', error);
//     throw error;
//   }
// } 