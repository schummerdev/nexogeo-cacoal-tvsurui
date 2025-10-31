import React, { useState, useEffect } from 'react';
import './BannerCarousel.css';

const BannerCarousel = ({ banners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 10000); // Troca a cada 10 segundos

    return () => clearInterval(interval);
  }, [banners.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const currentBanner = banners[currentIndex];

  return (
    <div className="banner-carousel">
      <div className="banner-slide">
        {currentBanner.link ? (
          <a href={currentBanner.link} target="_blank" rel="noopener noreferrer">
            <img src={currentBanner.image} alt={currentBanner.alt || `Banner ${currentIndex + 1}`} />
          </a>
        ) : (
          <img src={currentBanner.image} alt={currentBanner.alt || `Banner ${currentIndex + 1}`} />
        )}
      </div>

      {/* Indicadores de navegação */}
      <div className="banner-indicators">
        {banners.map((_, index) => (
          <button
            key={index}
            className={`indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Ir para banner ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default BannerCarousel;
