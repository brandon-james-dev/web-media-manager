import { FormFactor } from "../../componentModel";

/**
 * Everything the form-factor resolver needs. The caller gathers the viewport
 * size and the pointer and television signals, which keeps the resolver pure
 * and testable without a DOM.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="tablet" />
 * ```
 * @example
 * ```ts
 * const inputs: FormFactorInputs = {
 *   width: 820,
 *   height: 1180,
 *   coarsePointer: true,
 *   noPointer: false,
 *   tvUserAgent: false,
 *   tvOverride: false,
 * };
 * ```
 */
export interface FormFactorInputs {
  width: number;
  height: number;
  coarsePointer: boolean;
  noPointer: boolean;
  tvUserAgent: boolean;
  tvOverride: boolean;
  pin?: FormFactor;
}

/**
 * Picks the layout form factor for a viewport. The rules are tried in order
 * and the first match wins: an explicit pin, then television, then the narrow
 * and landscape-phone cases, then tablet, then desktop.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="mobile" />
 * ```
 * @example
 * ```ts
 * resolveFormFactor({
 *   width: 390,
 *   height: 844,
 *   coarsePointer: true,
 *   noPointer: false,
 *   tvUserAgent: false,
 *   tvOverride: false,
 * }); // "mobile"
 * ```
 */
export function resolveFormFactor(inputs: FormFactorInputs): FormFactor {
  if (inputs.pin) return inputs.pin;

  if (inputs.tvOverride || inputs.tvUserAgent) return FormFactor.Tv;
  if (inputs.noPointer && inputs.width >= 960) return FormFactor.Tv;

  if (inputs.width < 640) return FormFactor.Mobile;
  if (
    inputs.coarsePointer &&
    inputs.width > inputs.height &&
    inputs.height <= 500
  ) {
    return FormFactor.Mobile;
  }

  if (inputs.width >= 640 && inputs.width <= 1023) return FormFactor.Tablet;
  if (inputs.coarsePointer && inputs.width >= 1024 && inputs.width <= 1366) {
    return FormFactor.Tablet;
  }

  return FormFactor.Desktop;
}
