import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function updateUserProfiles(trigger: string = 'manual'): Promise<boolean> {
  try {
    console.log(`Déclenchement de la mise à jour des profils utilisateurs: ${trigger}`)
    
    const scriptPath = path.join(process.cwd(), 'userProfilAR.py')
    const command = `python "${scriptPath}" --trigger "${trigger}"`
    
    console.log(`Exécution de la commande: ${command}`)
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 secondes timeout
      cwd: process.cwd()
    })
    
    if (stderr) {
      console.error('Erreur lors de l\'exécution du script Python:', stderr)
    }
    
    console.log('Sortie du script Python:', stdout)
    
    // Vérifier si le script s'est exécuté avec succès
    if (stdout.includes('MISE À JOUR TERMINÉE AVEC SUCCÈS')) {
      console.log('Mise à jour des profils utilisateurs réussie')
      return true
    } else {
      console.warn('Le script Python ne semble pas s\'être exécuté correctement')
      return false
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script de mise à jour des profils:', error)
    return false
  }
}

// Fonction pour exécuter la mise à jour de manière asynchrone (sans bloquer la réponse)
export function updateUserProfilesAsync(trigger: string = 'manual'): void {
  // Exécuter en arrière-plan
  setImmediate(async () => {
    try {
      await updateUserProfiles(trigger)
    } catch (error) {
      console.error('Erreur lors de la mise à jour asynchrone des profils:', error)
    }
  })
}