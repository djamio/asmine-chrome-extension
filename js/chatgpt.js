// export function generateProductAuditPrompt(product) {
//   return `
// Audit the following WooCommerce product and provide a comprehensive analysis:

// Product Details:
// - Title: ${product.name}
// - Short Description: ${product.short_description || product.description?.substring(0, 150) + '...'}
// - Full Description: ${product.description}
// - Specifications: ${JSON.stringify(product.specifications || [])}
// - Categories: ${JSON.stringify(product.categories || [])}
// - Tags: ${JSON.stringify(product.tags || [])}
// - Regular Price: ${product.regular_price || 'N/A'}
// - Sale Price: ${product.sale_price || 'N/A'}
// - Images: ${product.images?.length > 0 ? 'Yes' : 'No'}
// - Reviews Count: ${product.reviews_count || 0}
// - Meta Data: ${JSON.stringify(product.meta_data || [])}

// Please analyze all aspects and return a JSON response with the following structure:
// {
//   "titleScore": number (0-100),
//   "titleAnalysis": string,
//   "newTitle": string,
//   "shortDescriptionScore": number (0-100),
//   "shortDescriptionAnalysis": string,
//   "newShortDescription": string,
//   "descriptionScore": number (0-100),
//   "descriptionAnalysis": string,
//   "newDescription": string,
//   "specificationsScore": number (0-100),
//   "specificationsAnalysis": string,
//   "suggestedSpecs": string[],
//   "categoriesScore": number (0-100),
//   "categoriesAnalysis": string,
//   "suggestedCategories": string[],
//   "tagsScore": number (0-100),
//   "tagsAnalysis": string,
//   "suggestedTags": string[],
//   "imageQuality": number (0-100),
//   "imageAnalysis": string,
//   "reviewsScore": number (0-100),
//   "reviewAnalysis": string,
//   "globalScore": number (0-100),
//   "overallAnalysis": string,
//   "priorityImprovements": string[]
// }

// Only return the JSON object, no additional text.`;
// }

// export function generateReviewPrompt(product, rating) {
//   return `
// Generate a detailed and authentic product review for the following WooCommerce product:

// Product Details:
// - Name: ${product.name}
// - Description: ${product.description}
// - Rating: ${rating} out of 5 stars

// Please write a natural-sounding review that:
// 1. Matches the ${rating}-star rating
// 2. Mentions specific product features and benefits
// 3. Includes both pros and cons (if applicable)
// 4. Sounds authentic and personal
// 5. Is between 50-100 words

// Return only the review text, no additional formatting or explanation.`;
// }

// export async function sendToChatGPT(prompt) {
//   const textarea = document.querySelector('textarea');
//   if (!textarea) {
//     throw new Error('Cannot find ChatGPT input');
//   }

//   // Clear any existing text
//   textarea.value = '';
//   textarea.focus();
//   document.execCommand('insertText', false, prompt);
//   textarea.dispatchEvent(new Event('input', { bubbles: true }));

//   // Find and click the send button
//   const btnSend = textarea.closest('form').querySelector('button');
//   if (!btnSend) {
//     throw new Error('Cannot find send button');
//   }
//   btnSend.click();

//   // Wait for response
//   return new Promise((resolve, reject) => {
//     let attempts = 0;
//     const maxAttempts = 30;

//     const checkResponse = () => {
//       const messages = document.querySelectorAll('.markdown.prose');
//       const lastMessage = messages.length > 0 ? messages[messages.length - 1].innerText : null;
      
//       if (lastMessage && lastMessage.includes('{') && lastMessage.includes('}')) {
//         try {
//           const jsonStart = lastMessage.indexOf('{');
//           const jsonEnd = lastMessage.lastIndexOf('}') + 1;
//           const jsonString = lastMessage.substring(jsonStart, jsonEnd);
//           const auditData = JSON.parse(jsonString);
//           resolve(auditData);
//         } catch (err) {
//           if (attempts < maxAttempts) {
//             attempts++;
//             setTimeout(checkResponse, 1000);
//           } else {
//             reject(new Error('Failed to parse ChatGPT response'));
//           }
//         }
//       } else if (attempts < maxAttempts) {
//         attempts++;
//         setTimeout(checkResponse, 1000);
//       } else {
//         reject(new Error('Timeout: No response received'));
//       }
//     };

//     setTimeout(checkResponse, 1000);
//   });
// } 