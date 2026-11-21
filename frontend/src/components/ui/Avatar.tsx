interface AvatarProps {
  name?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const AVATAR_COLORS = [
  { bg: '#e0e7ff', text: '#3730a3' }, // Indigo
  { bg: '#ede9fe', text: '#5b21b6' }, // Violet
  { bg: '#dbeafe', text: '#1e40af' }, // Blue
  { bg: '#dcfce7', text: '#166534' }, // Emerald
  { bg: '#fef3c7', text: '#92400e' }, // Amber
  { bg: '#ffe4e6', text: '#9f1239' }, // Rose
  { bg: '#e0f2fe', text: '#075985' }, // Sky
];

export function getAvatarColor(identifier: string) {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function Avatar({ name, email, size = 'md', className = '' }: AvatarProps) {
  const label = name || email || 'User';
  const initial = label.trim().slice(0, 1).toUpperCase();
  const color = getAvatarColor(email || name || 'default');

  return (
    <div
      className={`tf-avatar tf-avatar-${size} ${className}`}
      style={{ backgroundColor: color.bg, color: color.text }}
      title={label}
      aria-label={label}
    >
      <span className="tf-avatar-initial">{initial}</span>
    </div>
  );
}
