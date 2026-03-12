
const dataService = require("../services/mongodb");
const productsService = require("../services/productsService");
const QRCode = require("qrcode");
const FormData = require("form-data");
const config = require("../config/config");


const getProduct = async (req, res) => {
  try {
    const product = await dataService.getDocument("products", req.params.productId);
    res.status(200).send(product);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};
const getProducts = async (req, res) => {
  try {
    const products = await dataService.deleteDocumentsByQuery("products", req.body.query);
    res.status(200).send(products);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send([]);
    return;
  }
};

const createProduct = async (req, res) => {
  try {
    const product = await productsService.createProduct(req.body.product);
    res.status(200).send(product);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(null);
    return;
  }
};
const updateProduct = async (req, res) => {
  try {
    await productsService.updateProduct(req.body.product);
    res.status(200).send(products);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send([]);
    return;
  }
};

const deleteProduct = async (req, res) => {
  try {
    const result = await productsService.deleteProduct(req.params.productId);
    res.status(200).send(result);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(false);
    return;
  }
};



module.exports = {
  getProduct: getProduct,
  getProducts: getProducts,
  createProduct: createProduct,
  updateProduct: updateProduct,
  deleteProduct: deleteProduct,
};

app.get("/products/:productId", productsController.getProduct);
app.post("/products", productsController.createProduct);
app.put("/products/:productId", productsController.updateProduct);
app.delete("/products/:productId", productsController.deleteProduct);
app.post("/all-products", productsController.getProducts);