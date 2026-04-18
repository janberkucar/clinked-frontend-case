import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('renders primary navigation labels in order', () => {
    const links = fixture.nativeElement.querySelectorAll(
      'header nav a',
    ) as NodeListOf<HTMLAnchorElement>;
    expect(links.length).toBe(2);
    expect(links[0].textContent?.trim()).toBe('Articles');
    expect(links[1].textContent?.trim()).toBe('Create article');
  });
});
