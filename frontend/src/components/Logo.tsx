import logoImg from '@/imports/ChatGPT_Image_Aug_30__2026__04_48_13_PM.png'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  textOnly?: boolean
}

export default function Logo({ size = 'md', textOnly = false }: LogoProps) {
  const sizeMap = { sm: 32, md: 48, lg: 80 }
  const textSizeMap = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' }
  const px = sizeMap[size]

  return (
    <div className="flex items-center gap-2">
      {!textOnly && (
        <img
          src={logoImg}
          alt="جبت كام؟"
          width={px}
          height={px}
          className="object-contain flex-shrink-0"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(79,70,229,0.2))' }}
        />
      )}
      <span
        className={`font-black ${textSizeMap[size]} bg-gradient-to-l from-indigo-600 to-teal-500 bg-clip-text text-transparent leading-tight`}
        style={{ fontFamily: 'Cairo' }}
      >
        جبت كام؟
      </span>
    </div>
  )
}
