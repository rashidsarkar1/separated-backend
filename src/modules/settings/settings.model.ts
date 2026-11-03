import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  shopName: { type: String, default: 'Wholesale OS' },
  address: { type: String, default: 'Online Distribution Network' },
  phone: { type: String, default: '+8801XXXXXXXXX' },
  secondaryPhone: { type: String, default: '' },
  email: { type: String, default: 'support@wholesaleos.com' },
  footerText: { type: String, default: 'Thank you for your business!' }
}, { timestamps: true });

export const Settings = mongoose.model('Settings', settingsSchema);
