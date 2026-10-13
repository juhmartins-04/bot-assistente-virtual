import { useEffect } from 'react'

export function useWidget({ publicId, config, ativo }) {
  useEffect(() => {
    if (!ativo) return
    const script = document.createElement('script')
    script.src = '/atendente-virtual-widget.js'; script.async = true
    if (publicId) script.dataset.site = publicId
    if (config) window.ATENDENTE_CONFIG = config
    document.body.appendChild(script)
    return () => {
      script.remove()
      document.querySelector('[data-atendente-widget]')?.remove()
      if (config && window.ATENDENTE_CONFIG === config) delete window.ATENDENTE_CONFIG
    }
  }, [publicId, config, ativo])
}
