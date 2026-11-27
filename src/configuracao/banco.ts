import mongoose from 'mongoose';

export async function conectarBanco(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('[banco] conexão com o MongoDB estabelecida');
}

export async function desconectarBanco(): Promise<void> {
  await mongoose.disconnect();
}
