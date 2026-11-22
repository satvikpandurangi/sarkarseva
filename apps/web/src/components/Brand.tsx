export function Brand() {
  return (
    <>
      <span className="brand-mark" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2" />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M12 3V10" transform={`rotate(${i * 30} 12 12)`} />
          ))}
        </svg>
      </span>
      <span className="seva-wordmark">
        Sarkar<em>Seva</em>
        <small>नागरिक सेवा मार्गदर्शक</small>
      </span>
    </>
  );
}
