import React, { useMemo } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { usePhotoGallery } from '../hooks/usePhotoGallery';
import { useLabels } from '../hooks/useLabels';
import { formatPrice } from '../lib/propertyDetail';
import { colors } from '../theme';
import { Property } from '../types/property';
import { PhotoGallery } from './PhotoGallery';
import { getSharedPropertyViewStyles } from './SharedPropertyView.styles';

export interface SharedPropertyViewProps {
  property: Property;
}

export const SharedPropertyView: React.FC<SharedPropertyViewProps> = ({ property }) => {
  const { sharedProperty, propertyDetail, auth, gallery } = useLabels();
  const { galleryVisible, openGallery, closeGallery } = usePhotoGallery();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getSharedPropertyViewStyles(colors[colorScheme]), [colorScheme]);

  const images = property.images ?? [];
  const cover = images[0] || property.image_url;
  const photos = images.length > 0 ? images : cover ? [cover] : [];

  const heroContent = (
    <>
      {cover ? (
        <Image testID="shared-hero" source={{ uri: cover }} style={styles.hero} resizeMode="cover" />
      ) : (
        <View style={styles.noPhoto}>
          <Text style={styles.noPhotoText}>{propertyDetail.noPhotos}</Text>
        </View>
      )}
      {photos.length > 0 && (
        <View style={styles.photoBadge}>
          <Text style={styles.photoBadgeText}>{propertyDetail.photosCount(1, photos.length)}</Text>
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {photos.length > 0 ? (
        <TouchableOpacity
          style={styles.heroWrapper}
          onPress={openGallery}
          accessibilityRole="button"
          accessibilityLabel={gallery.openA11y(photos.length)}
        >
          {heroContent}
        </TouchableOpacity>
      ) : (
        <View style={styles.heroWrapper}>{heroContent}</View>
      )}
      <PhotoGallery visible={galleryVisible} images={photos} onClose={closeGallery} />

      <Text style={styles.price}>{formatPrice(String(property.price))}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {property.title}
      </Text>
      <Text style={styles.address}>{`${property.address}, ${property.city}`}</Text>

      <View style={styles.facts}>
        <View style={styles.fact}>
          <Text style={styles.factText}>{sharedProperty.bedrooms(property.bedrooms)}</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.factText}>{sharedProperty.bathrooms(property.bathrooms)}</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.factText}>{sharedProperty.area(property.square_meters)}</Text>
        </View>
      </View>

      {property.description ? (
        <>
          <Text style={styles.sectionTitle}>{sharedProperty.descriptionTitle}</Text>
          <Text style={styles.description}>{property.description}</Text>
        </>
      ) : null}

      {property.agency_name ? (
        <Text style={styles.listedBy}>{auth.listedBy(property.agency_name, property.agent_name)}</Text>
      ) : null}
    </View>
  );
};
