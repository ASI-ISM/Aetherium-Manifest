import Ajv2020, {
  type AnySchema,
  type ErrorObject,
  type Options,
  type ValidateFunction,
} from "ajv/dist/2020";
import addFormats from "ajv-formats";

import {
  createGovernor,
  makeSchemaValidator,
  type ParticleControlContract,
  type RuntimeGovernor,
  type RuntimeGovernorOptions,
} from "./governor";
import particleControlSchemaJson from "./particle-control.schema.json";

export const PARTICLE_CONTROL_SCHEMA = particleControlSchemaJson as AnySchema;
export const PARTICLE_CONTROL_SCHEMA_ID =
  typeof (PARTICLE_CONTROL_SCHEMA as { $id?: unknown }).$id === "string"
    ? ((PARTICLE_CONTROL_SCHEMA as { $id: string }).$id)
    : "https://aetherium.dev/schemas/contracts/particle-control.schema.json";

export type ParticleControlPayload = Required<ParticleControlContract>;
export type ParticleControlValidateFunction = ValidateFunction<ParticleControlPayload>;

export interface CreateParticleControlAjvOptions extends Partial<Options> {
  addFormatsPlugin?: boolean;
  preloadSchema?: boolean;
}

export interface CreateAjvGovernorOptions extends RuntimeGovernorOptions {
  ajv?: Ajv2020;
  ajvOptions?: CreateParticleControlAjvOptions;
}

function hasSchema(ajv: Ajv2020, schemaId: string): boolean {
  return Boolean(ajv.getSchema(schemaId));
}

function cloneAjvErrors(errors?: ErrorObject[] | null): ErrorObject[] {
  return (errors ?? []).map((error) => ({ ...error }));
}

/**
 * Create an Ajv instance configured for JSON Schema draft-2020-12.
 *
 * Notes:
 * - We disable strict schema checks by default because the contract includes
 *   vendor-extension keywords such as `x-field-evolution`.
 * - We register `ajv-formats` because the contract uses `format: "date-time"`.
 */
export function createParticleControlAjv(
  options: CreateParticleControlAjvOptions = {},
): Ajv2020 {
  const {
    addFormatsPlugin = true,
    preloadSchema = true,
    allErrors = true,
    strict = false,
    strictSchema = false,
    validateFormats = true,
    allowUnionTypes = true,
    ...rest
  } = options;

  const ajv = new Ajv2020({
    allErrors,
    strict,
    strictSchema,
    validateFormats,
    allowUnionTypes,
    ...rest,
  });

  if (addFormatsPlugin) {
    addFormats(ajv);
  }

  if (preloadSchema && !hasSchema(ajv, PARTICLE_CONTROL_SCHEMA_ID)) {
    ajv.addSchema(PARTICLE_CONTROL_SCHEMA, PARTICLE_CONTROL_SCHEMA_ID);
  }

  return ajv;
}

/**
 * Compile (or retrieve) the particle-control validator.
 */
export function compileParticleControlValidator(
  ajv: Ajv2020 = createParticleControlAjv(),
): ParticleControlValidateFunction {
  const existing = ajv.getSchema(PARTICLE_CONTROL_SCHEMA_ID);
  if (existing) {
    return existing as ParticleControlValidateFunction;
  }

  return ajv.compile<ParticleControlPayload>(
    PARTICLE_CONTROL_SCHEMA,
  ) as ParticleControlValidateFunction;
}

/**
 * Validate a payload directly with Ajv and preserve a stable copy of errors.
 */
export function validateParticleControlPayload(
  payload: ParticleControlContract,
  validator: ParticleControlValidateFunction = compileParticleControlValidator(),
): {
  valid: boolean;
  errors: ErrorObject[];
} {
  const valid = Boolean(validator(payload as ParticleControlPayload));
  return {
    valid,
    errors: cloneAjvErrors(validator.errors),
  };
}

/**
 * Adapt Ajv's validation function to the schemaValidator signature expected by governor.ts.
 */
export function createGovernorSchemaValidator(
  validator: ParticleControlValidateFunction = compileParticleControlValidator(),
): NonNullable<RuntimeGovernorOptions["schemaValidator"]> {
  return makeSchemaValidator((payload) => {
    const valid = Boolean(validator(payload as ParticleControlPayload));
    return {
      valid,
      errors: cloneAjvErrors(validator.errors).map((error) => ({
        instancePath: error.instancePath,
        message: error.message,
      })),
    };
  }) as NonNullable<RuntimeGovernorOptions["schemaValidator"]>;
}

/**
 * Convenience factory: create a RuntimeGovernor already wired to Ajv.
 */
export function createAjvGovernor(
  options: CreateAjvGovernorOptions = {},
): RuntimeGovernor {
  const ajv = options.ajv ?? createParticleControlAjv(options.ajvOptions);
  const validator = compileParticleControlValidator(ajv);

  return createGovernor({
    ...options,
    schemaValidator: createGovernorSchemaValidator(validator),
  });
}

/**
 * Optional helper for startup diagnostics.
 */
export function assertParticleControlSchemaCompiles(
  ajv: Ajv2020 = createParticleControlAjv(),
): ParticleControlValidateFunction {
  try {
    return compileParticleControlValidator(ajv);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to compile particle-control schema with Ajv: ${detail}`);
  }
}

/**
 * Example usage:
 *
 * import { createAjvGovernor } from "./ajv_validator";
 *
 * const governor = createAjvGovernor();
 * const decision = governor.process(payload, {
 *   previous_state: "THINKING",
 *   device_tier: "MID",
 * });
 */
