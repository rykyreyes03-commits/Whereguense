import { useEffect } from 'react';
import L from 'leaflet';
import { sitios } from './data/sitios';
import { useSellos } from './hooks/useSellos';
import Header from './components/Header';
import PanelPasaporte from './components/PanelPasaporte';
import MapaRuta from './components/MapaRuta';

function App() {
  const { sellos, sellar } = useSellos();

  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  const handleSellar = (sitio) => {
    const resultado = sellar(sitio);
    alert(resultado.mensaje);
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <Header />
      <PanelPasaporte sellos={sellos} total={sitios.length} />
      <MapaRuta sitios={sitios} onSellar={handleSellar} />
    </div>
  );
}

export default App;