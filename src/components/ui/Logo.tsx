/**
 * A re-creation of the cafe's own mark (brick-red frame, green stripes, "caffe" over a black "aroma" bar)
 * so it stays crisp at any size. Swap for the owner's vector original when we get it.
 */
export default function Logo({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex flex-col items-center justify-center bg-[#f7efe0] leading-none ${className}`}
      style={{ width: size, height: size, border: "2px solid var(--aroma-red)", borderRadius: 3, padding: 2 }}
      aria-hidden
    >
      <span className="block w-full" style={{ borderTop: "1.5px solid var(--aroma-green)", borderBottom: "1.5px solid var(--aroma-green)", padding: "1px 0 0" }}>
        <span className="block text-center text-[#1a110c]" style={{ fontFamily: "var(--font-script)", fontSize: size * 0.3, lineHeight: 1 }}>
          caffe
        </span>
      </span>
      <span className="mt-[2px] block w-full bg-[#14100d] text-center text-[#f7efe0]" style={{ fontFamily: "var(--font-script)", fontSize: size * 0.3, lineHeight: 1.15 }}>
        aroma
      </span>
    </span>
  );
}
