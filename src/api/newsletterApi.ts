import { apiClient, type ApiResponse } from './client';

export interface NewsletterSubscribeResponse {
  success: boolean;
  message: string;
}

/**
 * Newsletter API Service
 * Maps to backend endpoint:
 * - POST /api/newsletter/subscribe/
 */
export const newsletterApi = {
  /**
   * Subscribe email to the newsletter mailing list.
   */
  async subscribe(email: string): Promise<ApiResponse<NewsletterSubscribeResponse>> {
    const fallback: NewsletterSubscribeResponse = {
      success: true,
      message: 'Subscribed to the Chilly Flakes journal successfully.',
    };

    return apiClient.post<NewsletterSubscribeResponse>(
      'newsletter/subscribe/',
      { email },
      fallback
    );
  },
};
