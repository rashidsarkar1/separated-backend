import mongoose from 'mongoose';

const dealerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String },
  contactInfo: {
    email: { type: String },
    phone: { type: String }
  }
}, { timestamps: true });

dealerSchema.index({ name: 1 });
dealerSchema.index({ address: 1 });
dealerSchema.index({ "contactInfo.phone": 1 });
dealerSchema.index({ "contactInfo.email": 1 });

export const Dealer = mongoose.model('Dealer', dealerSchema);
