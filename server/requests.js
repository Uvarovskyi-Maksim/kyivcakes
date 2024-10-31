import { query } from "express";

export const graphqlMutationAddingItem = {
  query: `
        mutation MyMutation($documentId: String!, $itemId: String!, $qty: Decimal!) {
          upsertDocumentItem(
            input: {
              documentId: $documentId
              itemId: $itemId
              qty: $qty
            }
          ) {
            item {
              sku
              id
              basePrice
            }
          }
        }
      `,
  variables: {
    documentId: "",
    itemId: "",
    qty: 0,
  },
};
export const graphqlMutationCreateDocument = {
  query: `
    mutation MyMutation($statusId: String!, $type: String!, $contragentId: String!, $resultAt: NaiveDateTime!) {
      createDocument(input: { statusId: $statusId, type: $type, contragentId: $contragentId, resultAt: $resultAt }) {
        id
      }
    }
  `,
  variables: {
    statusId: "draft",
    type: "inbound_order",
  },
};

export const graphqlGetContact = {
  query: `
    query MyQuery($phoneEq: String!) {
      getContact(phoneEq: $phoneEq) {
        node{
        phone
        ownerId
        ownerSchema
        }
      }
    }
  `,
  variables: {
    phoneEq: "+380955072447", // Устанавливаем значение переменной перед отправкой запроса
  },
};

export const graphqlGetProducts = {
  query: `
  query MyQuery {
  listItems {
    edges {
      node {
        id
        name
        category {
          title
        }
        basePrice
        coverImage {
          publicUrl
        }
      }
    }
  }
}
  `
}

export const upsertContragent = {
  query: `
  mutation MyMutation($formalName: String!) {
    upsertContragent(input: { formalName: $formalName }) {
      id
      formalName
    }
  }
`,
  variables: {

  }
}
export const createContact = {
  query: `
     mutation MyMutation($ownerId: UUID!, $ownerSchema: OwnerSchema!, $firstName: String!, $phone: String!) {
        createContact(input: { ownerId: $ownerId, ownerSchema: $ownerSchema, firstName: $firstName, phone: $phone }) {
          ownerId
        }
      }
    `,
  variables: {

  }
}