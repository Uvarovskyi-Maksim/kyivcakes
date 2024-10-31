const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

app.post('/api/mongo-orders', (req, res) => {
    const orderData = req.body;
    console.log("Received order data:", orderData);
    // Process orderData (e.g., save to database)

    res.status(200).json({ message: "Order received successfully" });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
