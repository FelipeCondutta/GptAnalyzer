import mongoose from 'mongoose';
const accessTokenSchema = new mongoose.Schema({
 email: String,
 token: String,
 createdAt: { type: Date, default: Date.now },
 used: { type: Boolean, default: false },
 trans_cod: { type: String, default: null }
});

export default mongoose.model('AccessToken', accessTokenSchema);
