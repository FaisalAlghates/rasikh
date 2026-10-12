import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';

class PickedFile {
  const PickedFile(this.bytes, this.name, this.contentType);
  final Uint8List bytes;
  final String name, contentType;
}

/// Lets the person attach a photo (a receipt, or a ticket photo). Not used for inspection evidence, which can only
/// come from the in-app camera.
abstract class PhotoPicker {
  Future<PickedFile?> pick();
}

class GalleryPhotoPicker implements PhotoPicker {
  const GalleryPhotoPicker();

  @override
  Future<PickedFile?> pick() async {
    final f = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 2000,
      imageQuality: 85,
    );
    if (f == null) return null;
    return PickedFile(await f.readAsBytes(), f.name, 'image/jpeg');
  }
}
