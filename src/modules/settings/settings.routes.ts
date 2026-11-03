import express from 'express';
import mongoose from 'mongoose';
import { Settings } from './settings.model';
import sendResponse from '../../utils/sendResponse';
import { localStore } from '../common/localStore';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let settings;
    if (mongoose.connection.readyState === 1) {
      try {
        settings = await Settings.findOne();
        if (!settings) {
          settings = await Settings.create({});
        }
      } catch (err) {
        console.warn('DB fetch settings failed, falling back to localStore:', err);
      }
    }
    
    if (!settings) {
      settings = localStore.settings;
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      data: settings
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/', async (req, res) => {
  try {
    let settings;
    if (mongoose.connection.readyState === 1) {
      try {
        settings = await Settings.findOneAndUpdate({}, req.body, { upsert: true, new: true });
      } catch (err) {
        console.warn('DB update settings failed, falling back to localStore:', err);
      }
    }

    if (!settings) {
      localStore.settings = {
        ...localStore.settings,
        ...req.body
      };
      settings = localStore.settings;
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export const settingsRoutes = router;
