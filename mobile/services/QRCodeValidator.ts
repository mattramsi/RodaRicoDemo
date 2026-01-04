import { QRCodeData, CabinError } from '../types/cabin';

/**
 * Valida se o QR Code está no formato correto do RodaRico
 */
export class QRCodeValidator {
  private static readonly SUPPORTED_VERSIONS = ['1.0'];
  private static readonly EXPECTED_TYPE = 'rodarico_cabin';
  private static readonly MIN_CABIN_ID = 1;
  private static readonly MAX_CABIN_ID = 9999;
  private static readonly MIN_BLUETOOTH_NAME_LENGTH = 3;

  /**
   * Valida e parse o conteúdo do QR Code
   * @param rawData - String bruta do QR Code
   * @returns QRCodeData se válido, null se inválido
   */
  static validate(rawData: string): { data: QRCodeData | null; error: CabinError | null } {
    try {
      // 1. Parse JSON
      let parsed: any;
      try {
        parsed = JSON.parse(rawData);
      } catch (parseError) {
        return {
          data: null,
          error: {
            code: 'INVALID_QR_CODE',
            message: 'QR Code não é um JSON válido',
            details: parseError,
          },
        };
      }

      // 2. Validar tipo
      if (parsed.type !== this.EXPECTED_TYPE) {
        return {
          data: null,
          error: {
            code: 'INVALID_QR_CODE',
            message: `QR Code inválido. Esperado tipo "${this.EXPECTED_TYPE}", recebido "${parsed.type}"`,
            details: { receivedType: parsed.type },
          },
        };
      }

      // 3. Validar versão
      if (!parsed.v || !this.SUPPORTED_VERSIONS.includes(parsed.v)) {
        return {
          data: null,
          error: {
            code: 'INVALID_QR_CODE',
            message: `Versão do QR Code não suportada: ${parsed.v}. Versões suportadas: ${this.SUPPORTED_VERSIONS.join(', ')}`,
            details: { receivedVersion: parsed.v },
          },
        };
      }

      // 4. Validar cabinId
      if (!parsed.cabinId || typeof parsed.cabinId !== 'number') {
        return {
          data: null,
          error: {
            code: 'INVALID_CABIN_ID',
            message: 'cabinId ausente ou inválido',
            details: { cabinId: parsed.cabinId },
          },
        };
      }

      if (parsed.cabinId < this.MIN_CABIN_ID || parsed.cabinId > this.MAX_CABIN_ID) {
        return {
          data: null,
          error: {
            code: 'INVALID_CABIN_ID',
            message: `cabinId fora do range válido (${this.MIN_CABIN_ID}-${this.MAX_CABIN_ID})`,
            details: { cabinId: parsed.cabinId },
          },
        };
      }

      // 5. Validar bluetoothName
      if (!parsed.bluetoothName || typeof parsed.bluetoothName !== 'string') {
        return {
          data: null,
          error: {
            code: 'INVALID_BLUETOOTH_NAME',
            message: 'bluetoothName ausente ou inválido',
            details: { bluetoothName: parsed.bluetoothName },
          },
        };
      }

      if (parsed.bluetoothName.length < this.MIN_BLUETOOTH_NAME_LENGTH) {
        return {
          data: null,
          error: {
            code: 'INVALID_BLUETOOTH_NAME',
            message: `bluetoothName muito curto (mínimo ${this.MIN_BLUETOOTH_NAME_LENGTH} caracteres)`,
            details: { bluetoothName: parsed.bluetoothName },
          },
        };
      }

      // 6. Validar timestamp (opcional, mas avisar se muito antigo)
      if (parsed.timestamp) {
        try {
          const qrTime = new Date(parsed.timestamp);
          const now = new Date();
          const diffHours = (now.getTime() - qrTime.getTime()) / (1000 * 60 * 60);

          if (diffHours > 24) {
            console.warn(`[QRCodeValidator] QR Code foi gerado há ${Math.floor(diffHours)} horas`);
          }
        } catch (error) {
          console.warn('[QRCodeValidator] Timestamp inválido:', parsed.timestamp);
        }
      }

      // 7. Construir objeto validado
      const validatedData: QRCodeData = {
        v: parsed.v,
        type: parsed.type,
        cabinId: parsed.cabinId,
        bluetoothName: parsed.bluetoothName,
        hardware: parsed.hardware,
        timestamp: parsed.timestamp,
      };

      return { data: validatedData, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'INVALID_QR_CODE',
          message: 'Erro ao validar QR Code',
          details: error,
        },
      };
    }
  }

  /**
   * Gera QR Code mock para testes
   * @param cabinId - ID da cabine (padrão: 999)
   * @returns JSON string para gerar QR Code
   */
  static generateMockQRCode(cabinId: number = 999): string {
    const mockData: QRCodeData = {
      v: '1.0',
      type: 'rodarico_cabin',
      cabinId: cabinId,
      bluetoothName: `ESP32_DEV_${cabinId}`,
      hardware: {
        version: 'dev',
        firmware: '0.0.1-dev',
      },
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(mockData);
  }

  /**
   * Gera dados mockados parseados diretamente (sem precisar de QR Code)
   * @param cabinId - ID da cabine (padrão: random 900-999)
   * @returns QRCodeData mockado
   */
  static generateMockData(cabinId?: number): QRCodeData {
    const randomCabinId = cabinId || Math.floor(Math.random() * 100) + 900; // 900-999

    return {
      v: '1.0',
      type: 'rodarico_cabin',
      cabinId: randomCabinId,
      bluetoothName: `ESP32_MOCK_${String(randomCabinId).padStart(2, '0')}`,
      hardware: {
        version: 'mock',
        firmware: '0.0.1-mock',
      },
      timestamp: new Date().toISOString(),
    };
  }
}

