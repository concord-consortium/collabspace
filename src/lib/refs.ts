import * as firebase from "firebase"
import { PortalActivity } from "./auth"

export const getUserTemplateListPath = (userId:string) => {
  return `users/${userId}/templates`
}

export const getUserTemplateListRef = (userId:string) => {
  return firebase.database().ref(getUserTemplateListPath(userId))
}

export const getUserTemplatePath = (userId:string, templateId:string) => {
  return `users/${userId}/templates/${templateId}`
}

export const getUserTemplateRef = (userId:string, templateId:string) => {
  return firebase.database().ref(getUserTemplatePath(userId, templateId))
}

export const getPortalPath = (activity:PortalActivity) => {
  return activity.domain === "demo" ? "demo" : `portals/${activity.domain}`
}

export const getActivityPath = (activity:PortalActivity) => {
  return `${getPortalPath(activity)}/classes/${activity.classInfo.classHash}/activities/${activity.id}`
}

export const getActivityRef = (activity:PortalActivity) => {
  return firebase.database().ref(getActivityPath(activity))
}

export const getGroupDocumentPath = (activity:PortalActivity, documentId?:string) => {
  const prefix = `${getPortalPath(activity)}/documents`
  return documentId ? `${prefix}/${documentId}` : prefix
}
