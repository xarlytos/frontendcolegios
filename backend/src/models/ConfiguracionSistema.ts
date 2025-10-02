import { Schema, model, Document } from 'mongoose';

export interface IConfiguracionSistema extends Document {
  clave: string;
  valor: any;
  descripcion: string;
  actualizadoPor: string;
  actualizadoEn: Date;
}

const configuracionSistemaSchema = new Schema<IConfiguracionSistema>({
  clave: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  valor: {
    type: Schema.Types.Mixed,
    required: true
  },
  descripcion: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  actualizadoPor: {
    type: String,
    required: true,
    trim: true
  },
  actualizadoEn: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices
configuracionSistemaSchema.index({ clave: 1 });
configuracionSistemaSchema.index({ actualizadoEn: -1 });

export const ConfiguracionSistema = model<IConfiguracionSistema>('ConfiguracionSistema', configuracionSistemaSchema);
