import React, { useRef, useState } from "react";
import { View, Text, Button, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Camera, CameraType } from "expo-camera";

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = React.useState<null | boolean>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current && isCameraReady) {
      const photo = await cameraRef.current.takePictureAsync();
      router.push({ pathname: "/imagePreview", params: { uri: photo.uri } });
    }
  };

  if (hasPermission === null) {
    return <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900"><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900"><Text>No access to camera</Text></View>;
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
      <View className="w-full px-4 mt-2">
        <Button title="Back" onPress={() => router.back()} color="#64748b" />
      </View>
      <Camera
        ref={cameraRef}
        className="w-11/12 aspect-[16/9] rounded-xl overflow-hidden mt-4"
        type={CameraType.back}
        onCameraReady={() => setIsCameraReady(true)}
        ratio="16:9"
      />
      <TouchableOpacity className="w-16 h-16 rounded-full bg-blue-700 border-4 border-white mt-6 mb-2 self-center" onPress={takePicture} />
      <Text className="text-base mt-2 text-gray-700 dark:text-gray-200">Tap the button to scan a document</Text>
    </View>
  );
}
