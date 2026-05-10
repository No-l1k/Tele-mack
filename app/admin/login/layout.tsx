export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Страница логина не должна иметь sidebar админки
  return <>{children}</>
}
