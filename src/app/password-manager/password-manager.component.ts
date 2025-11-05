import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface PasswordEntry {
  website: string;
  username: string;
  password?: string;
}

//affichage conditionnel du mot de passe.
interface DisplayPasswordEntry extends PasswordEntry {
  isVisible: boolean;
}

@Component({
  selector: 'app-password-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './password-manager.component.html',
  styleUrls: ['./password-manager.component.css']
})
export class PasswordManagerComponent implements OnInit {
  passwords: DisplayPasswordEntry[] = [];
  //Objet identifiant à enregistrer
  newEntry: PasswordEntry = {
    website: '',
    username: '',
    password: ''
  };
  editingIndex: number | null = null; 
  editEntryData: PasswordEntry = { website: '', username: '', password: '' };

  constructor(private ngZone: NgZone) { }

  ngOnInit(): void {
    (window as any).electronAPI.onPasswordsData((event: any, data: PasswordEntry[]) => {
      this.ngZone.run(() => {
        this.passwords = data.map(entry => ({
          ...entry,
          isVisible: false
        }));
      });
    });
  }


  addPassword(): void {
    this.passwords.push({ ...this.newEntry, isVisible: false });
    this.saveChanges();
    this.newEntry = { website: '', username: '', password: '' };
  }

  closeWindow(): void {
    (window as any).electronAPI.closePasswordWindow();
  }
  deleteEntry(index: number): void {
    this.passwords.splice(index, 1); 
    this.saveChanges();
  }

  toggleVisibility(entry: DisplayPasswordEntry): void {
    entry.isVisible = !entry.isVisible; 
  }


  startEdit(index: number): void {
    this.editingIndex = index;
    this.editEntryData = { ...this.passwords[index] };
  }

  saveEdit(index: number): void {
    this.passwords[index] = { ...this.editEntryData, isVisible: this.passwords[index].isVisible };
    this.saveChanges();
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.editEntryData = { website: '', username: '', password: '' };
  }
  private saveChanges(): void {
    const dataToSave = this.passwords.map(entry => ({
      website: entry.website,
      username: entry.username,
      password: entry.password
    }));
    (window as any).electronAPI.savePasswords(dataToSave);
  }
}