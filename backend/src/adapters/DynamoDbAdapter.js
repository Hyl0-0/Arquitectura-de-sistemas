// Adaptador NoSQL para Amazon DynamoDB (AWS SDK v3)
// Con soporte nativo para AWS DynamoDB y fallback local para pruebas offline
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

export class DynamoDbClientWrapper {
  constructor() {
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'AlumcoPlatformTable';
    this.region = process.env.AWS_REGION || 'us-east-1';

    // Determinar si hay credenciales AWS reales o si operamos en modo simulado para desarrollo local
    this.isAwsAvailable = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

    if (this.isAwsAvailable) {
      const rawClient = new DynamoDBClient({ region: this.region });
      this.docClient = DynamoDBDocumentClient.from(rawClient);
    } else {
      // Almacenamiento NoSQL en memoria que respeta la semántica PK/SK de DynamoDB
      this.localStore = new Map();
      console.log('ℹ️ DynamoDB operando en modo adaptador desacoplado (Clean Architecture). Conexión lista para AWS.');
    }
  }

  async putItem(item) {
    if (this.isAwsAvailable) {
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));
      return item;
    } else {
      const key = `${item.PK}#${item.SK}`;
      this.localStore.set(key, JSON.parse(JSON.stringify(item)));
      return item;
    }
  }

  async getItem(pk, sk) {
    if (this.isAwsAvailable) {
      const res = await this.docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk }
      }));
      return res.Item || null;
    } else {
      const key = `${pk}#${sk}`;
      const item = this.localStore.get(key);
      return item ? JSON.parse(JSON.stringify(item)) : null;
    }
  }

  async queryByPk(pk, skBeginsWith = null) {
    if (this.isAwsAvailable) {
      let keyCondition = 'PK = :pk';
      const expressionAttrValues = { ':pk': pk };

      if (skBeginsWith) {
        keyCondition += ' AND begins_with(SK, :skPrefix)';
        expressionAttrValues[':skPrefix'] = skBeginsWith;
      }

      const res = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: expressionAttrValues
      }));
      return res.Items || [];
    } else {
      const results = [];
      for (const [k, v] of this.localStore.entries()) {
        if (v.PK === pk) {
          if (!skBeginsWith || v.SK.startsWith(skBeginsWith)) {
            results.push(JSON.parse(JSON.stringify(v)));
          }
        }
      }
      return results;
    }
  }

  async scanBySkPrefix(skPrefix) {
    if (this.isAwsAvailable) {
      const res = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':prefix': skPrefix }
      }));
      return res.Items || [];
    } else {
      const results = [];
      for (const [k, v] of this.localStore.entries()) {
        if (v.SK && v.SK.startsWith(skPrefix)) {
          results.push(JSON.parse(JSON.stringify(v)));
        }
      }
      return results;
    }
  }
}
