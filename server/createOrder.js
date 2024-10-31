export async function createOrder(headers, graphqlMutationCreateDocument, graphqlMutationAddingItem, items) {
    // Шаг 1: Создание документа
    await fetch("https://api.keruj.com/api/graphql", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(graphqlMutationCreateDocument),
    })
        .then((response) => response.json())
        .then((data) => {
            const documentId = data?.data?.createDocument?.id;
            if (!documentId) {
                throw new Error("Не удалось создать документ");
            }
            console.log("Создан документ с ID:", documentId);

            // Шаг 2: Добавление элементов в документ
            graphqlMutationAddingItem.variables.documentId = documentId;

            // Проверка наличия items и их itemId
            if (!Array.isArray(items) || items.length === 0) {
                throw new Error("Список items пуст или не является массивом");
            }

            items.forEach((item) => {
                if (!item.catalogItemId) {
                    throw new Error(`Ошибка добавления элемента: itemId отсутствует для элемента ${item.itemName}`);
                }

                graphqlMutationAddingItem.variables.itemId = item.sku;
                graphqlMutationAddingItem.variables.qty = item.quantity || 1;

                // Запрос на добавление каждого элемента в документ
                fetch("https://api.keruj.com/api/graphql", {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify(graphqlMutationAddingItem),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.errors) {
                            throw new Error(`Ошибка добавления элемента: ${data.errors[0].message}`);
                        }
                        console.log("Элемент добавлен:", data);
                    })
                    .catch((error) => {
                        console.error("Ошибка при добавлении элемента:", error);
                        throw error;
                    });
            });
        })
        .catch((error) => {
            console.error("Ошибка при отправке запроса:", error);
            throw error;
        });
}