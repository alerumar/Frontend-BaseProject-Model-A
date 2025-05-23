import { Platform } from 'react-native'
import * as mime from 'react-native-mime-types'
import { API_BASE_URL } from '@env'

const getPlatform = () => Platform?.OS ?? 'web'

// Returns {name:fileName, fileObject:file}
const normalizeFile = (file) => {
  if (getPlatform() === 'web') {
    const fileName = file.assets[0].fileName
    const imageType = file.assets[0].mimeType
    const byteString = atob(file.assets[0].uri.split(',')[1])
    const ab = new ArrayBuffer(byteString.length)
    const arr = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) { arr[i] = byteString.charCodeAt(i) }
    const blob = new Blob([arr], {
      type: imageType
    })
    return {
      name: file.paramName,
      fileObject: new File([blob], `${fileName}.${mime.extension(imageType)}`, {
        type: imageType
      })
    }
  } else {
    return {
      name: file.paramName,
      fileObject: {
        name: file.assets[0].uri.slice(-20),
        type: file.assets[0].mimeType,
        uri: Platform.OS === 'ios' ? file.assets[0].uri.replace('file://', '') : file.assets[0].uri
      }
    }
  }
}

const getDataWithoutBodyFiles = (dataWithFiles) => {
  const data = { ...dataWithFiles }
  Object.keys(data).filter(key => data[key] && data[key].assets).forEach(key => delete data[key])
  return data
}

const getFilesFromData = (data) => {
  return Object.keys(data).filter(key => data[key] && data[key].assets && data[key].assets[0] && data[key].assets[0].uri && data[key].assets[0].height).map(key => { // data[key].height para ver si viene del image picker
    data[key].paramName = key
    return data[key]
  })
}

function constructFormData (files, dataWithoutFiles) {
  const formData = new FormData()
  files.forEach(file => {
    const normalizedFile = normalizeFile(file)
    formData.append(normalizedFile.name, normalizedFile.fileObject)
  })
  Object.keys(dataWithoutFiles).forEach((key) => {
    if (dataWithoutFiles[key] !== null) { // if null values are present they are sent as strings with value 'null' and could be misleading for the backend / database
      formData.append(key, dataWithoutFiles[key])
    }
  })
  return formData
}

function getMultiPartHeader () {
  return {
    headers: {
      'Content-Type': 'multipart/form-data; charset=utf-8; boundary="separation between parts";'
    }
  }
}

function prepareData (preparedData) {
  let config, files
  if (preparedData) {
    files = getFilesFromData(preparedData)
  }
  preparedData = getDataWithoutBodyFiles(preparedData)
  if (files?.length) {
    preparedData = constructFormData(files, preparedData)
    config = getMultiPartHeader()
  }
  return { config, preparedData }
}

const prepareEntityImages = (entity, imagePropertyNames) => {
  const entityCopy = { ...entity }
  imagePropertyNames.forEach(impagePropertyName => {
    if (entityCopy[impagePropertyName]) {
      entityCopy[impagePropertyName] = { assets: [{ uri: `${API_BASE_URL}/${entityCopy[impagePropertyName]}` }] }
    }
  })

  return entityCopy
}

export { normalizeFile, getDataWithoutBodyFiles, getFilesFromData, constructFormData, getMultiPartHeader, prepareData, prepareEntityImages }
