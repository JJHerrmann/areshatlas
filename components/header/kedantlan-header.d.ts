export interface KedantlanHeaderOptions {
  base?: string;
  atlasHref?: string;
  atlasLabel?: string;
  outline?: boolean;
  label?: string;
}
export function mountKedantlanHeader(root: HTMLElement, opts?: KedantlanHeaderOptions): () => void;
