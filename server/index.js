import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';

import Product from './models/Product.js';
// Импорт необходимых модулей
import {
    graphqlMutationAddingItem,
    graphqlMutationCreateDocument,
    graphqlGetContact,
    upsertContragent,
    createContact,
    graphqlGetProducts
} from './requests.js';
import { createOrder } from './createOrder.js';
import { headers } from './headers.js';

const app = express();
app.use(cors());
app.use(bodyParser.json());


mongoose.connect('mongodb+srv://kyivcakes1:yfmCfjFhGuNhwRJ9@cluster0.09vxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('Connected to MongoDB');
  }).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });
// Налаштування транспорту для nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // можна використовувати інший сервіс (наприклад, Yahoo, Outlook)
    auth: {
        user: 'kyivcakes1@gmail.com', // ваша електронна пошта
        pass: 'rpwo gswb qddw eycn'
    }
});

app.post('/api/mongo-orders', async (req, res) => {
    try {
        console.log('Отримані замовлення: ', req.body);
        const { order, contact, billingInfo } = req.body;

        // Перевірка наявності елементів замовлення
        if (!order || order.length === 0) {
            return res.status(400).json({ message: "Відсутні елементи замовлення" });
        }

        const items = order.map(item => ({
            itemName: item.name || 'Не вказано',
            quantity: item.quantity || 1,
            price: item.cost || 0,
            catalogItemId: item.catalogItemId || 'Не вказано',
            sku: item.id,
            deliveryDate: `${item.deliveryDate}:00`
        }));
        graphqlGetContact.variables.phoneEq = req.body.phone;
        upsertContragent.variables.formalName = req.body.establishment;
        let contragentId;

///////////////////////////////////////////////////////////////////////////Получение продуктов
        await fetch("https://api.keruj.com/api/graphql", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(graphqlGetProducts),
        })
            .then(async (response) => {
                const data = await response.json(); // wait for JSON data
                const products = data.data.listItems.edges;

                products.forEach(async (el) => {
                    const productData = {
                        id: el.node.id,
                        name: el.node.name,
                        basePrice: el.node.basePrice,
                        category: el.node.category ? el.node.category.title : null,
                        coverImage: el.node.coverImage ? el.node.coverImage.publicUrl : null
                    };

                    try {
                        const product = new Product(productData);
                        await product.save(); // Save product to MongoDB
                        console.log('Product saved:', product);
                    } catch (error) {
                        console.error('Error saving product:', error);
                    }
                });
            })
            .catch((error) => {
                console.error("Error fetching products:", error);
            });
///////////////////////////////////////////////////////////////////////////Получение продуктов

        await fetch("https://api.keruj.com/api/graphql", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(graphqlGetContact),
        })
            .then((response) => response.json())
            .then(async (data) => {
                if (data.data.getContact != null) {
                    const { ownerId, ownerSchema } = data.data.getContact.node;
                    console.log("ownerId:", ownerId);
                    console.log("ownerSchema:", ownerSchema);

                    contragentId = ownerId;
                    graphqlMutationCreateDocument.variables.contragentId = ownerId;
                    graphqlMutationCreateDocument.variables.resultAt = `${req.body.deliveryDate}:00`;
                    return createOrder(headers, graphqlMutationCreateDocument, graphqlMutationAddingItem, items);
                } else {
                    // Якщо контакт не знайдено, створюємо контрагента та контакт
                    await fetch("https://api.keruj.com/api/graphql", {
                        method: "POST",
                        headers: headers,
                        body: JSON.stringify(upsertContragent),
                    })
                        .then((response) => response.json())
                        .then((data) => {
                            contragentId = data?.data?.upsertContragent?.id;
                            console.log(contragentId);
                            if (contragentId) {
                                createContact.variables = {
                                    ownerId: contragentId,
                                    ownerSchema: "CONTRAGENTS",
                                    firstName: req.body.firstName,
                                    phone: req.body.phone,
                                };
                                console.log(createContact.variables);

                                fetch("https://api.keruj.com/api/graphql", {
                                    method: "POST",
                                    headers: headers,
                                    body: JSON.stringify(createContact),
                                })
                                    .then(response => {
                                        if (!response.ok) {
                                            throw new Error("Помилка мережі: " + response.status);
                                        }
                                        return response.json(); // Перетворюємо відповідь на JSON
                                    })
                                    .then(data => {
                                        console.log("Відповідь від сервера:", JSON.stringify(data, null, 2));
                                        if (data && data.data && data.data.createContact) {
                                            console.log("Створений контакт:", data.data.createContact);
                                        } else {
                                            throw new Error("Відповідь не містить даних про створений контакт");
                                        }
                                    })
                                    .catch(error => {
                                        console.error("Помилка при створенні контакту:", error);
                                    });
                            } else {
                                throw new Error("Не вдалося отримати ID контрагента");
                            }

                        })
                        .then(() => {
                            graphqlMutationCreateDocument.variables.contragentId = contragentId;
                            graphqlMutationCreateDocument.variables.resultAt = `${req.body.deliveryDate}:00`;
                            return createOrder(headers, graphqlMutationCreateDocument, graphqlMutationAddingItem, items);
                        });
                }
            })
            .then(async () => {
                // Формування повідомлення для клієнта
                const messageText = `
Дякуємо за ваше замовлення!
Деталі замовлення:
${items.map(item => `- ${item.itemName}, Кількість: ${item.quantity}, Ціна: ${item.price}, Дата доставки: ${`${req.body.deliveryDate}:00`}`).join('\n')}
Загальна сума: ${items.reduce((total, item) => total + item.price * item.quantity, 0)}
                `;


                // Надсилання email клієнту
                await transporter.sendMail({
                    from: 'kyivcakes1@gmail.com',
                    to: req.body.email,  // email клієнта
                    subject: 'Ваше замовлення прийнято',
                    text: messageText
                })
                    .then(() => console.log("Сообщение успешно отправлено"))
                    .catch(error => console.error("Ошибка отправки сообщения:", error));
                res.status(200).json({ message: "Замовлення успішно оброблено та дані надіслані в CRM" });
            })
            .catch((error) => {
                console.error("Помилка при надсиланні запиту:", error);
                res.status(500).json({ message: "Помилка при обробці даних" });
            });

    } catch (error) {
        console.error("Помилка при обробці замовлення:", error);
        res.status(500).json({ message: "Помилка при обробці даних" });
    }
});

app.get('/api/products', async (req, res) => {
    try {
      const products = await Product.find({});
      res.status(200).json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Error fetching products" });
    }
  });
  

app.listen(5000, () => {
    console.log('Сервер запущен на http://13.60.53.226');
});
