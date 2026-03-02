export default function CarlMascot({ size = 40, spinning = false, glow = false }) {
  return (
    <div
      className={`carl-mascot ${spinning ? 'spinning' : ''} ${glow ? 'glow' : ''}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.48,
        fontWeight: 800,
        color: 'white',
        fontFamily: "'Inter', system-ui, sans-serif",
        position: 'relative',
        boxShadow: glow
          ? '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.2)'
          : '0 2px 8px rgba(0, 0, 0, 0.3)',
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {/* Outer ring */}
      <div
        style={{
          position: 'absolute',
          inset: -2,
          borderRadius: '50%',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          animation: spinning ? 'none' : undefined,
        }}
      />
      C
    </div>
  );
}
