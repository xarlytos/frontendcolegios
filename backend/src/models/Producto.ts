import { Schema, model, Document } from 'mongoose';

export interface IProducto extends Document {
  _id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  creadoPor: string;
  actualizadoPor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productoSchema = new Schema<IProducto>({
  nombre: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    unique: true
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: 500
  },
  activo: {
    type: Boolean,
    default: true
  },
  creadoPor: {
    type: String,
    required: true
  },
  actualizadoPor: {
    type: String
  }
}, {
  timestamps: true
});

// Índices
productoSchema.index({ nombre: 1 });
productoSchema.index({ activo: 1 });

export const Producto = model<IProducto>('Producto', productoSchema);
