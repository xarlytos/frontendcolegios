import { Schema, model, Document, Types } from 'mongoose';

// Resolver conflicto en la interfaz
export interface IContacto extends Document {
  _id: string;
  nombreCompleto: string;
  telefono?: string;
  instagram?: string;
  nombreColegio: string;
  anioNacimiento: number;
  comercialId: Types.ObjectId;
  fechaAlta: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  diaLibre?: string; // ← Mantener este campo
  universidadId?: Types.ObjectId; // ← Campo opcional
  titulacionId?: Types.ObjectId; // ← Campo opcional
  curso?: string; // ← Campo opcional
}

// Resolver conflicto en el schema
const contactoSchema = new Schema<IContacto>({
  nombreCompleto: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  telefono: {
    type: String,
    trim: true,
    // Validación más permisiva para teléfonos
    match: /^[+]?[0-9\s\-\(\)\.]{7,20}$/
  },
  instagram: {
    type: String,
    trim: true,
    maxlength: 30,
    // Permitir puntos y otros caracteres comunes en Instagram
    match: /^[a-zA-Z0-9_\-\.]+$/
  },
  nombreColegio: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  anioNacimiento: {
    type: Number,
    required: true,
    min: 1950,
    max: new Date().getFullYear()
  },
  comercialId: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  fechaAlta: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  diaLibre: {
    type: String,
    enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    required: false
  },
  universidadId: {
    type: Schema.Types.ObjectId,
    ref: 'Universidad',
    required: false
  },
  titulacionId: {
    type: Schema.Types.ObjectId,
    ref: 'Titulacion',
    required: false
  },
  curso: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true
});

// Teléfono e Instagram son opcionales - no se requiere validación

// Índices
contactoSchema.index({ nombreColegio: 1 });
contactoSchema.index({ nombreCompleto: 'text' });
contactoSchema.index({ telefono: 1 });
contactoSchema.index({ instagram: 1 });
contactoSchema.index({ comercialId: 1 });
contactoSchema.index({ fechaAlta: 1 });

export const Contacto = model<IContacto>('Contacto', contactoSchema);