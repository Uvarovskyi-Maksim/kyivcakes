import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    id: { type: String },
    name: { type: String},
    basePrice: { type: String },
    category: { type: String },
    coverImage: { type: String }    
});

const Product = mongoose.model('Product', productSchema);

export default Product;
