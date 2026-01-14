import { Schema, model, Document } from 'mongoose';

export interface IColegio extends Document {
  _id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
  fechaCreacion: Date;
  createdBy: string;
}

const colegioSchema = new Schema<IColegio>({
  nombre: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    maxlength: 200
  },
  direccion: {
    type: String,
    trim: true,
    maxlength: 500
  },
  telefono: {
    type: String,
    trim: true,
    maxlength: 20
  },
  email: {
    type: String,
    trim: true,
    maxlength: 100,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  activo: {
    type: Boolean,
    default: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Índices
colegioSchema.index({ nombre: 1 });
colegioSchema.index({ activo: 1 });

export const Colegio = model<IColegio>('Colegio', colegioSchema);
