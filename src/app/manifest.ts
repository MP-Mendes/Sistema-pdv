import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sistema PDV',
    short_name: 'PDV',
    description: 'Ponto de venda e gestão comercial',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#1e293b',
    lang: 'pt-BR',
  };
}
