import * as firebase from "firebase"
import * as queryString from "query-string"
import * as superagent from "superagent"
import * as jwt from "jsonwebtoken"

export interface AuthQueryParams {
  demo?: string
  token?: string
  domain?: string
  domain_uid?: string
}

export interface PortalUser {
  id: number
  first_name: string
  last_name: string
  email?: string
}
export type PortalUserType = "student" | "teacher"

export interface PortalClassInfo {
  uri: string
  name: string
  state: string
  class_hash: string
  teachers: PortalUser[]
  students: PortalUser[]
}

export interface PortalInfo {
  user: PortalUser
  userType: PortalUserType
  domain: string
  classInfo: PortalClassInfo
  isDemo: boolean
}

export interface PortalJWTClaims {
  "alg": string
  "iss": string
  "sub": string
  "aud": string
  "iat": number
  "exp": number
  "uid": number
  "domain": string
  "externalId": number
  "returnUrl": string
  "logging": boolean
  "domain_uid": number
  "class_info_url": string
}

export const portalAuth = () => {
  return new Promise<PortalInfo|null>((resolve, reject) => {
    const params:AuthQueryParams = queryString.parse(window.location.search)

    // no token means not launched from portal so there is no portal user
    if (!params.token) {
      resolve(null)
      return
    }

    if (!params.domain) {
      reject("Missing domain query parameter (required when token parameter is present)")
      return
    }

    const isDemo = params.domain.indexOf("cloudfunctions") !== -1

    const generateJWTUrl = `${params.domain}${isDemo ? "demoGetFakeFirebaseJWT" : "api/v1/jwt/firebase?firebase_app=collabspace"}`
    superagent
      .get(generateJWTUrl)
      .set("Authorization", `Bearer ${params.token}`)
      .end((err, res) => {
        if (err) {
          reject(err.toString())
        }
        else if (!res.body || !res.body.token) {
          reject("No token found in JWT request response")
        }
        else {
          const jwtClaims:PortalJWTClaims = jwt.decode(res.body.token) as any
          if (!jwtClaims || !jwtClaims.class_info_url) {
            reject("Invalid token found in JWT request response")
          }
          else {
            const classInfoUrl = `${jwtClaims.class_info_url}${isDemo && params.demo ? `?demo=${params.demo}` : ""}`
            superagent
              .get(classInfoUrl)
              .set("Authorization", `Bearer/JWT ${res.body.token}`)
              .end((err, res) => {
                if (err) {
                  reject(err.toString())
                }
                else if (!res.body || !res.body.class_hash) {
                  reject("Invalid class info response")
                }
                else {
                  const classInfo:PortalClassInfo = res.body

                  // find the user in the class info
                  let portalUser:PortalUser|null = null
                  const findPortalUser = (user:PortalUser) => {
                    if (user.id === jwtClaims.uid) {
                      portalUser = user
                    }
                  }

                  let userType:PortalUserType = "student"
                  classInfo.students.forEach(findPortalUser)
                  if (!portalUser) {
                    userType = "teacher"
                    classInfo.teachers.forEach(findPortalUser)
                  }

                  if (!portalUser) {
                    reject("Current user not found in class roster")
                  }
                  else {
                    const domainParser = document.createElement("a")
                    domainParser.href = jwtClaims.domain

                    resolve({
                      user: portalUser,
                      userType: userType,
                      domain: isDemo ? "Demo" : domainParser.host,
                      classInfo: classInfo,
                      isDemo: isDemo
                    })
                  }
                }
              })
          }
        }
      })
  })
}

export const firebaseAuth = () => {
  return new Promise<firebase.User>((resolve, reject) => {
    firebase.auth().onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        resolve(firebaseUser)
      }
    })
    firebase.auth().signInAnonymously().catch(reject)
  })
}