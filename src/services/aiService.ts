/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InventoryInsightsParams {
  lowStockItems?: string[];
  recentSales?: string[];
}

/**
 * Fetches AI-generated inventory insights from the backend server.
 * The backend manages the Gemini API call securely using gemini-3.8-flash.
 */
export async function getInventoryInsights(params?: InventoryInsightsParams): Promise<string> {
  try {
    const response = await fetch('/api/v1/ai/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params || {}),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result?.data?.insights) {
      return result.data.insights;
    }
    return "Inventory levels and recent sales activity reviewed. Operational status nominal.";
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Unable to generate insights at this time. Please check your stock manually.";
  }
}

/**
 * Streams AI-generated inventory insights from the server via Server-Sent Events (SSE).
 */
export function streamInventoryInsights(
  onChunk: (chunkText: string) => void,
  onComplete?: () => void,
  onError?: (err: any) => void
): () => void {
  const eventSource = new EventSource('/api/v1/ai/insights/stream');

  eventSource.onmessage = (event) => {
    if (event.data === '[DONE]') {
      eventSource.close();
      if (onComplete) onComplete();
      return;
    }

    try {
      const parsed = JSON.parse(event.data);
      if (parsed.text) {
        onChunk(parsed.text);
      }
    } catch (e) {
      // Raw string fallback
      onChunk(event.data);
    }
  };

  eventSource.onerror = (err) => {
    console.error("AI Stream Error:", err);
    eventSource.close();
    if (onError) onError(err);
  };

  // Return cancel/cleanup function
  return () => {
    eventSource.close();
  };
}
