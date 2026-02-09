export default function Avatar({ name, color = "#2563eb", size = 28 }) {
  if (!name) return null;
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      title={name}
      className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38, letterSpacing: -0.5 }}
    >
      {initials}
    </span>
  );
}
