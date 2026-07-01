import type { Frescor } from '../receita/receita-gateway.js';

/** Endereço normalizado de um CEP (AD-4/AD-5). Coordenadas quando a fonte fornece (geo / PostGIS). */
export interface Endereco {
  readonly cep: string;
  readonly estado: string; // UF
  readonly cidade: string;
  readonly bairro: string;
  readonly rua: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

export interface ResultadoCep {
  readonly valor: Endereco | null;
  readonly fonte: 'BrasilAPI';
  readonly timestamp: string; // ISO-8601
  readonly frescor: Frescor;
}

export interface CepGateway {
  consultarCep(cep: string): Promise<ResultadoCep>;
}
