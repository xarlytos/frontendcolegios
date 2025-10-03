import { Schema, model, Document, Types } from 'mongoose';

export interface IGraduacion extends Document {
  _id: string;
  nombreColegio: string;
  anioNacimiento: number;
  responsable?: string;
  tipoProducto?: string;
  prevision?: string;
  estado?: string;
  observaciones?: string;
  contactos: Types.ObjectId[];
  creadoPor: Types.ObjectId;
  actualizadoPor?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const graduacionSchema = new Schema<IGraduacion>({
  nombreColegio: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  anioNacimiento: {
    type: Number,
    required: true,
    min: 1990,
    max: 2030
  },
  responsable: {
    type: String,
    trim: true,
    maxlength: 100
  },
  tipoProducto: {
    type: String,
    trim: true,
    maxlength: 100
  },
  prevision: {
    type: String,
    trim: true,
    maxlength: 200
  },
  estado: {
    type: String,
    trim: true,
    maxlength: 50
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  contactos: [{
    type: Schema.Types.ObjectId,
    ref: 'Contacto'
  }],
  creadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  actualizadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario'
  }
}, {
  timestamps: true
});

// Índices
graduacionSchema.index({ nombreColegio: 1, anioNacimiento: 1 }, { unique: true });
graduacionSchema.index({ anioNacimiento: 1 });
graduacionSchema.index({ responsable: 1 });
graduacionSchema.index({ estado: 1 });

export const Graduacion = model<IGraduacion>('Graduacion', graduacionSchema);


