const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");




async function getProducts(query) {
    try {
        const products = await dataService.getDocuments('products', query);
        return products;

    } catch (error) {
        console.log(error)
        return []
    }
}

async function getProduct(productId) {
    try {
        const product = await dataService.getDocumentByQuery('products', {_id: new ObjectId(productId)});
        return product;

    } catch (error) {
        console.log(error)
        return null
    }
}

async function createProduct(product) {
    try {
        const newProduct = await dataService.createDocument('products', product);
        return newProduct;
    } catch (error) {
        console.log(error)
        return null
    }
}

async function updateProduct(product) {
    try {
        const updatedProduct = await dataService.updateDocument('products', product);
        return updatedProduct;
    } catch (error) {
        console.log(error)
        return null
    }
}

async function deleteProduct(productId) {
    try {

        await dataService.updateDocumentByQuery('products', {_id: ObjectId(productId)}, {$set: {deleted: true}});
        return true;
    } catch (error) {
        console.log(error)
        return false
    }
}


module.exports = {
    getProducts: getProducts,
    getProduct: getProduct,
    createProduct: createProduct,
    updateProduct: updateProduct,
    deleteProduct: deleteProduct,
};