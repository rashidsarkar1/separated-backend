import { Router } from 'express';
import catchAsync from '../../shared/catchasync';
import sendResponse from '../../utils/sendResponse';
import { ai } from './gemini.client';
import { localStore } from '../common/localStore';

const router = Router();

function getStockAndSalesContext(bodyLowStock?: string[], bodyRecentSales?: string[]) {
  let lowStockList: string[] = [];
  let recentSalesList: string[] = [];

  if (Array.isArray(bodyLowStock) && bodyLowStock.length > 0) {
    lowStockList = bodyLowStock;
  } else {
    // Extract from localStore
    const lowStock = localStore.products
      .filter((p) => !p.isDeleted)
      .map((p) => {
        const stockItem = localStore.stock.find((s) => s.productId === p._id);
        const qty = stockItem ? stockItem.quantity : 0;
        const threshold = p.lowStockThreshold || 15;
        return { product: p, qty, threshold };
      })
      .filter((item) => item.qty <= item.threshold);

    lowStockList = lowStock.map(
      (item) => `${item.product.name} (${item.product.category}): ${item.qty} ${item.product.unit} left (threshold: ${item.threshold})`
    );
  }

  if (Array.isArray(bodyRecentSales) && bodyRecentSales.length > 0) {
    recentSalesList = bodyRecentSales;
  } else {
    const recentOrders = localStore.transactions
      .filter((t) => t.type === 'sale')
      .slice(-5)
      .map((t) => `Order ${t._id}: ৳${t.totalAmount} (${t.items.length} line items)`);

    recentSalesList = recentOrders;
  }

  return { lowStockList, recentSalesList };
}

function buildPrompt(lowStockList: string[], recentSalesList: string[]): string {
  return `
You are an expert inventory analyst and procurement director for a wholesale distributor.
Based on the following data, provide 3 short, actionable bullet points for the store manager.

Low Stock Items:
${lowStockList.length > 0 ? lowStockList.join('\n') : 'All items are currently well-stocked.'}

Recent Sales:
${recentSalesList.length > 0 ? recentSalesList.join('\n') : 'No recent transactions recorded.'}

Keep it professional, concise, and technical. Focus on restock priority, cash flow velocity, and margin protection.
Do not use conversational greetings or filler text. Return exactly 3 high-impact actionable recommendations.
`;
}

/**
 * POST /api/v1/ai/insights
 * Generates inventory and sales actionable insights using gemini-3.8-flash on the server.
 */
router.post(
  '/insights',
  catchAsync(async (req, res) => {
    const { lowStockItems, recentSales } = req.body || {};
    const { lowStockList, recentSalesList } = getStockAndSalesContext(lowStockItems, recentSales);
    const prompt = buildPrompt(lowStockList, recentSalesList);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const insightsText = response.text || 'All inventory levels currently within nominal operational limits.';

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'AI insights generated successfully',
        data: {
          insights: insightsText,
        },
      });
    } catch (err: any) {
      console.error('Server Gemini API Error:', err);
      // Fallback response so the app keeps working gracefully
      const fallback = lowStockList.length > 0
        ? `• Restock Priority: High urgency on ${lowStockList.slice(0, 2).join(' and ')}.\n• Supplier Coordination: Issue purchase orders to prevent stockouts.\n• Cash Flow: Monitor receivables and review turnover velocity.`
        : '• Nominal Status: Inventory levels currently within operational guidelines.\n• Stock Health: Continue periodic cycle counts for high-velocity SKUs.\n• Margin Protection: Monitor wholesale pricing trends across primary suppliers.';

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'AI insights generated (fallback mode)',
        data: {
          insights: fallback,
        },
      });
    }
  })
);

/**
 * GET /api/v1/ai/insights
 * Convenience GET endpoint for inventory insights
 */
router.get(
  '/insights',
  catchAsync(async (req, res) => {
    const { lowStockList, recentSalesList } = getStockAndSalesContext();
    const prompt = buildPrompt(lowStockList, recentSalesList);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'AI insights generated successfully',
        data: {
          insights: response.text || 'Inventory metrics reviewed.',
        },
      });
    } catch (err: any) {
      console.error('Server Gemini API Error:', err);
      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'AI insights generated (fallback mode)',
        data: {
          insights: '• Review low-stock items in the Procurement Queue.\n• Reorder fast-moving inventory before lead times expire.\n• Monitor top customer ordering patterns.',
        },
      });
    }
  })
);

/**
 * GET/POST /api/v1/ai/insights/stream
 * Server-Sent Events (SSE) streaming endpoint for Gemini AI responses
 */
router.get(
  '/insights/stream',
  catchAsync(async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { lowStockList, recentSalesList } = getStockAndSalesContext();
    const prompt = buildPrompt(lowStockList, recentSalesList);

    try {
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      console.error('Server Gemini Stream Error:', err);
      res.write(`data: ${JSON.stringify({ text: 'Unable to stream insights at this time.' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  })
);

/**
 * POST /api/v1/ai/generate
 * Generic text generation route powered by gemini-3.8-flash on the server
 */
router.post(
  '/generate',
  catchAsync(async (req, res) => {
    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: 'Prompt is required',
        data: null,
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      sendResponse(res, {
        statusCode: 200,
        success: true,
        data: {
          text: response.text,
        },
      });
    } catch (err: any) {
      console.error('Server Gemini Generate Error:', err);
      sendResponse(res, {
        statusCode: 500,
        success: false,
        message: 'Failed to generate content',
        data: null,
      });
    }
  })
);

export const AIRoutes = router;
