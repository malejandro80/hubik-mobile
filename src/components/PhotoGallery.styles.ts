import { StyleSheet } from 'react-native';
import {
  GALLERY_BACKGROUND,
  GALLERY_FOREGROUND,
  GALLERY_THUMB_GAP,
  GALLERY_THUMB_SIZE,
} from '../constants/gallery';
import { shapes, spacing } from '../theme';

export const galleryStyles = StyleSheet.create({
  container: {
    backgroundColor: GALLERY_BACKGROUND,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    minHeight: 56,
  },
  closeButton: {
    width: spacing.touchMin,
    height: spacing.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    fontSize: 17,
    fontWeight: '700',
    color: GALLERY_FOREGROUND,
  },
  topBarSpacer: {
    width: spacing.touchMin,
  },
  pagerArea: {
    flex: 1,
  },
  page: {
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    width: spacing.touchMin,
    height: spacing.touchMin,
    marginTop: -spacing.touchMin / 2,
    borderRadius: shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  arrowPrevious: {
    left: 12,
  },
  arrowNext: {
    right: 12,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  stripList: {
    flexGrow: 0,
  },
  strip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  thumb: {
    width: GALLERY_THUMB_SIZE,
    height: GALLERY_THUMB_SIZE,
    marginRight: GALLERY_THUMB_GAP,
    borderRadius: shapes.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.6,
  },
  thumbSelected: {
    borderColor: GALLERY_FOREGROUND,
    opacity: 1,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
});
